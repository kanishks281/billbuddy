"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { BarLoader } from "react-spinners";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Users, User } from "lucide-react";

// ContactsPage displays the user's contacts (people and groups) and allows creating new groups.
// It fetches data from the backend and manages UI state for loading and modals.

export default function ContactsPage() {
  // State to control the visibility of the "Create Group" modal
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

  // Router and search params for navigation and reading URL parameters
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch contacts (users and groups) using a custom hook that handles loading and errors
  // This keeps the UI code clean and consistent
  const { data, isLoading } = useConvexQuery(api.contacts.getAllContacts);

  // Effect: If the URL contains ?createGroup=true, open the modal and remove the param from the URL
  // This allows deep-linking or redirecting users to open the modal directly
  useEffect(() => {
    const createGroupParam = searchParams.get("createGroup");

    if (createGroupParam === "true") {
      setIsCreateGroupModalOpen(true);

      // Remove the parameter from the URL for a cleaner look after opening the modal
      const url = new URL(window.location.href);
      url.searchParams.delete("createGroup");
      router.replace(url.pathname + url.search);
    }
  }, [searchParams, router]);

  // Show a loading spinner while fetching contacts
  if (isLoading) {
    return (
      <div className="container mx-auto py-12">
        <BarLoader width={"100%"} color="#36d7b7" />
      </div>
    );
  }

  // Destructure users and groups from the fetched data, fallback to empty arrays if no data
  const { users, groups } = data || { users: [], groups: [] };

  return (
    <div className="container mx-auto py-6">
      {/* Header: Page title and "Create Group" button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between mb-6">
        <h1 className="text-5xl gradient-title">Contacts</h1>
        {/* Button to open the "Create Group" modal */}
        <Button onClick={() => setIsCreateGroupModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Main content: Two columns for People and Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Individual Contacts (People) */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <User className="mr-2 h-5 w-5" />
            People
          </h2>
          {/* If no contacts, show a message. Otherwise, list each contact as a card */}
          {users.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                No contacts yet. Add an expense with someone to see them here.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Render each user as a clickable card linking to their detail page */}
              {users.map((user) => (
                <Link key={user.id} href={`/person/${user.id}`}>
                  <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* User avatar, fallback to first letter of name if no image */}
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.imageUrl} />
                            <AvatarFallback>
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Groups */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Groups
          </h2>
          {/* If no groups, show a message. Otherwise, list each group as a card */}
          {groups.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                No groups yet. Create a group to start tracking shared expenses.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Render each group as a clickable card linking to the group detail page */}
              {groups.map((group) => (
                <Link key={group.id} href={`/groups/${group.id}`}>
                  <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Group icon */}
                          <div className="bg-primary/10 p-2 rounded-md">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {group.memberCount} members
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* The modal for creating a group would be rendered here (not shown in this file) */}
    </div>
  );
}